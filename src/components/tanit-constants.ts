export const ACTION_LABELS: Record<string, string> = {
  absence_detected: "Absence détectée",
  request_sent: "Demande envoyée",
  reminder_sent: "Rappel envoyé",
  escalation_pending: "Escalade en cours",
  submission_validated: "Soumission validée",
  anomaly_detected: "Anomalie détectée",
};

export const ACTION_COLORS: Record<string, string> = {
  absence_detected: "text-red-600 bg-red-500/10 border-red-500/30",
  request_sent: "text-blue-600 bg-blue-500/10 border-blue-500/30",
  reminder_sent: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  escalation_pending: "text-blue-600 bg-blue-500/10 border-blue-500/30",
  submission_validated: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  anomaly_detected: "text-red-600 bg-red-500/10 border-red-500/30",
};

export const CHAT_SUGGESTIONS = [
  {
    title: "Vue d'ensemble",
    body: "Résumez la performance UCAR ce trimestre.",
    q: "Résume la performance UCAR ce trimestre.",
  },
  {
    title: "Anomalies",
    body: "Quels établissements présentent un risque ?",
    q: "Quels établissements présentent un risque actuellement ?",
  },
  {
    title: "Conformité",
    body: "Qui n'a pas soumis ses données ?",
    q: "Quels établissements n'ont pas soumis leurs données pour 2024-2025 ?",
  },
] as const;

export const DOMAIN_TABS = [
  { id: "academic", label: "Académique", count: 13 },
  { id: "finance", label: "Finances" },
  { id: "hr", label: "RH", count: 6 },
  { id: "research", label: "Recherche" },
  { id: "esg", label: "ESG" },
] as const;

export function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}

export function metricLabel(metric: string) {
  const labels: Record<string, string> = {
    effectif_etudiants: "Effectif étudiants",
    diplomes: "Diplômés",
    diplomes_total: "Diplômés",
    taux_reussite: "Taux de réussite",
    effectif_enseignants: "Effectif enseignants",
    ratio_etudiants_enseignant: "Ratio étudiants/enseignant",
    titulaires_percent: "Titulaires (%)",
    submission_absence: "Soumission absente",
  };

  return labels[metric] ?? metric;
}

const dateTimeFr = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtFR(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateTimeFr.format(date).replace(",", " ·");
}
