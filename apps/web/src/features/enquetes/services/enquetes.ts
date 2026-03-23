import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type PollOption = {
  id: string;
  text: string;
  votes: string[];
};

export type PollComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

export type Poll = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  createdBy: string;
  options: PollOption[];
  comments: PollComment[];
};

export type CreatePollInput = {
  title: string;
  description: string;
  options: string[];
};

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by_name: string;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
};

type PollVoteRow = {
  poll_id: string;
  option_id: string;
  user_id: string;
};

type PollCommentRow = {
  id: string;
  poll_id: string;
  message: string;
  created_at: string;
  created_by_name: string;
};

async function requireSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Sessao invalida. Faca login novamente.");
  }

  return data.user;
}

function mapPolls(rows: PollRow[], options: PollOptionRow[], votes: PollVoteRow[], comments: PollCommentRow[]): Poll[] {
  return rows.map((row) => {
    const pollOptions = options
      .filter((option) => option.poll_id === row.id)
      .sort((left, right) => left.position - right.position)
      .map((option) => ({
        id: option.id,
        text: option.label,
        votes: votes.filter((vote) => vote.option_id === option.id).map((vote) => vote.user_id),
      }));

    const pollComments = comments
      .filter((comment) => comment.poll_id === row.id)
      .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
      .map((comment) => ({
        id: comment.id,
        author: comment.created_by_name,
        message: comment.message,
        createdAt: comment.created_at,
      }));

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      createdAt: row.created_at,
      createdBy: row.created_by_name,
      options: pollOptions,
      comments: pollComments,
    };
  });
}

export async function listPolls(): Promise<Poll[]> {
  const [pollsResult, optionsResult, votesResult, commentsResult] = await Promise.all([
    supabase.from("polls").select("id, title, description, created_at, created_by_name").order("created_at", { ascending: false }),
    supabase.from("poll_options").select("id, poll_id, label, position").order("poll_id", { ascending: false }).order("position", { ascending: true }),
    supabase.from("poll_votes").select("poll_id, option_id, user_id"),
    supabase.from("poll_comments").select("id, poll_id, message, created_at, created_by_name").order("created_at", { ascending: true }),
  ]);

  if (pollsResult.error) throw new Error(pollsResult.error.message);
  if (optionsResult.error) throw new Error(optionsResult.error.message);
  if (votesResult.error) throw new Error(votesResult.error.message);
  if (commentsResult.error) throw new Error(commentsResult.error.message);

  return mapPolls(
    (pollsResult.data ?? []) as PollRow[],
    (optionsResult.data ?? []) as PollOptionRow[],
    (votesResult.data ?? []) as PollVoteRow[],
    (commentsResult.data ?? []) as PollCommentRow[],
  );
}

export async function createPoll(input: CreatePollInput): Promise<void> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();
  const createdByName = currentUser?.name?.trim() || authUser.email || "Morador";

  const options = input.options.map((option) => option.trim()).filter(Boolean);
  if (!input.title.trim() || options.length < 2) {
    throw new Error("Informe um titulo e pelo menos duas opcoes.");
  }

  const pollInsert = await supabase
    .from("polls")
    .insert({
      title: input.title.trim(),
      description: input.description.trim() || null,
      created_by: authUser.id,
      created_by_name: createdByName,
    })
    .select("id")
    .single();

  if (pollInsert.error || !pollInsert.data) {
    throw new Error(pollInsert.error?.message ?? "Nao foi possivel criar a enquete.");
  }

  const optionsInsert = await supabase.from("poll_options").insert(
    options.map((option, index) => ({
      poll_id: pollInsert.data.id,
      label: option,
      position: index + 1,
    })),
  );

  if (optionsInsert.error) {
    throw new Error(optionsInsert.error.message);
  }
}

export async function voteOnPoll(pollId: string, optionId: string): Promise<void> {
  const authUser = await requireSessionUser();

  const { error } = await supabase.from("poll_votes").upsert(
    {
      poll_id: pollId,
      option_id: optionId,
      user_id: authUser.id,
    },
    { onConflict: "poll_id,user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function addPollComment(pollId: string, message: string): Promise<void> {
  const authUser = await requireSessionUser();
  const currentUser = getUser();
  const authorName = currentUser?.name?.trim() || authUser.email || "Morador";

  const { error } = await supabase.from("poll_comments").insert({
    poll_id: pollId,
    message: message.trim(),
    created_by: authUser.id,
    created_by_name: authorName,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToPolls(onChange: () => void) {
  const channel = supabase
    .channel("polls-feed")
    .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_comments" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
