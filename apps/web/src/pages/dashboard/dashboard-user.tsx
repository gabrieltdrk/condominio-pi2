import AppLayout from "../../components/app-layout";

export default function DashboardUser() {
  return (
    <AppLayout title="Área do Morador">
      <h2 style={{ marginTop: 0 }}>Morador 👋</h2>
      <p>Opções típicas do morador:</p>
      <ul>
        <li>Ver avisos</li>
        <li>Taxas / boleto</li>
        <li>Reservas e ocorrências</li>
      </ul>
    </AppLayout>
  );
}