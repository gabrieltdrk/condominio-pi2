import { getUser } from "../../auth/services/auth";
import { supabase } from "../../../lib/supabase";

export type AssemblyType = "ORDINARIA" | "EXTRAORDINARIA";
export type AssemblyMode = "DIGITAL" | "HIBRIDA" | "PRESENCIAL";
export type AssemblyScope = "GERAL" | "ADMINISTRATIVO" | "EMERGENCIAL";
export type AssemblyStatus = "DRAFT" | "OPEN" | "CLOSED";

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
  creatorSignatureUrl?: string | null;
  creatorSignatureName?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  options: PollOption[];
  comments: PollComment[];
  assemblyType: AssemblyType;
  meetingMode: AssemblyMode;
  scope: AssemblyScope;
  status: AssemblyStatus;
  meetingAt: string | null;
  votingStartsAt: string;
  votingEndsAt: string | null;
  quorumMinPercent: number;
  approvalMinPercent: number;
  allowComments: boolean;
  minutesSummary: string;
};

export type CreatePollInput = {
  title: string;
  description: string;
  options: string[];
  assemblyType: AssemblyType;
  meetingMode: AssemblyMode;
  scope: AssemblyScope;
  status: AssemblyStatus;
  meetingAt?: string | null;
  votingStartsAt: string;
  votingEndsAt?: string | null;
  quorumMinPercent: number;
  approvalMinPercent: number;
  allowComments: boolean;
  attachmentFile?: File | null;
  signatureFile?: File | null;
};

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by_name: string;
  assembly_type?: AssemblyType | null;
  meeting_mode?: AssemblyMode | null;
  scope?: AssemblyScope | null;
  status?: AssemblyStatus | null;
  meeting_at?: string | null;
  voting_starts_at?: string | null;
  voting_ends_at?: string | null;
  quorum_min_percent?: number | null;
  approval_min_percent?: number | null;
  allow_comments?: boolean | null;
  minutes_summary?: string | null;
  creator_signature_url?: string | null;
  creator_signature_name?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
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
      creatorSignatureUrl: row.creator_signature_url ?? null,
      creatorSignatureName: row.creator_signature_name ?? row.created_by_name ?? null,
      attachmentUrl: row.attachment_url ?? null,
      attachmentName: row.attachment_name ?? null,
      options: pollOptions,
      comments: pollComments,
      assemblyType: row.assembly_type ?? "ORDINARIA",
      meetingMode: row.meeting_mode ?? "DIGITAL",
      scope: row.scope ?? "GERAL",
      status: row.status ?? "OPEN",
      meetingAt: row.meeting_at ?? null,
      votingStartsAt: row.voting_starts_at ?? row.created_at,
      votingEndsAt: row.voting_ends_at ?? null,
      quorumMinPercent: row.quorum_min_percent ?? 50,
      approvalMinPercent: row.approval_min_percent ?? 50,
      allowComments: row.allow_comments ?? true,
      minutesSummary: row.minutes_summary ?? "",
    };
  });
}

export async function listPolls(): Promise<Poll[]> {
  const [pollsResult, optionsResult, votesResult, commentsResult] = await Promise.all([
    supabase
      .from("polls")
      .select("id, title, description, created_at, created_by_name, assembly_type, meeting_mode, scope, status, meeting_at, voting_starts_at, voting_ends_at, quorum_min_percent, approval_min_percent, allow_comments, minutes_summary, creator_signature_url, creator_signature_name, attachment_url, attachment_name")
      .order("created_at", { ascending: false }),
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
      assembly_type: input.assemblyType,
      meeting_mode: input.meetingMode,
      scope: input.scope,
      status: input.status,
      meeting_at: input.meetingAt || null,
      voting_starts_at: input.votingStartsAt,
      voting_ends_at: input.votingEndsAt || null,
      quorum_min_percent: input.quorumMinPercent,
      approval_min_percent: input.approvalMinPercent,
      allow_comments: input.allowComments,
    })
    .select("id")
    .single();

  if (pollInsert.error || !pollInsert.data) {
    throw new Error(pollInsert.error?.message ?? "Nao foi possivel criar a assembleia.");
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

  // Upload opcional de anexo e assinatura
  if (input.attachmentFile || input.signatureFile) {
    const bucket = supabase.storage.from("assembly_files");
    const updates: Record<string, string | null> = {};

    if (input.attachmentFile) {
      const path = `polls/${pollInsert.data.id}/attachment-${Date.now()}-${input.attachmentFile.name}`;
      const { error: uploadError } = await bucket.upload(path, input.attachmentFile, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = bucket.getPublicUrl(path);
      updates.attachment_url = data.publicUrl;
      updates.attachment_name = input.attachmentFile.name;
    }

    if (input.signatureFile) {
      const path = `polls/${pollInsert.data.id}/signature-${Date.now()}.png`;
      const { error: uploadError } = await bucket.upload(path, input.signatureFile, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message);
      const { data } = bucket.getPublicUrl(path);
      updates.creator_signature_url = data.publicUrl;
      updates.creator_signature_name = createdByName;
    }

    if (Object.keys(updates).length > 0) {
      const updateResult = await supabase.from("polls").update(updates).eq("id", pollInsert.data.id);
      if (updateResult.error) throw new Error(updateResult.error.message);
    }
  }
}

export async function voteOnPoll(pollId: string, optionId: string): Promise<void> {
  const authUser = await requireSessionUser();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("status")
    .eq("id", pollId)
    .single();

  if (pollError) throw new Error(pollError.message);
  if (poll?.status === "CLOSED") {
    throw new Error("A assembleia ja foi encerrada.");
  }

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

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("allow_comments")
    .eq("id", pollId)
    .single();

  if (pollError) throw new Error(pollError.message);
  if (poll?.allow_comments === false) {
    throw new Error("Comentarios estao desativados nesta assembleia.");
  }

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

export async function updatePollStatus(pollId: string, status: AssemblyStatus, minutesSummary?: string): Promise<void> {
  const payload: { status: AssemblyStatus; minutes_summary?: string | null } = { status };
  if (typeof minutesSummary !== "undefined") {
    payload.minutes_summary = minutesSummary.trim() || null;
  }

  const { error } = await supabase
    .from("polls")
    .update(payload)
    .eq("id", pollId);

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
