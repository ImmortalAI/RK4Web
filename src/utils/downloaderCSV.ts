import type { SolutionPoint } from "@/utils/rkdp";

export function downloadCSV(data: SolutionPoint[], filename = 'solution.csv') {
  if (!data.length) return;

  const headers = Object.keys(data[0]);

  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => row[header]?.toString() ?? '').join(',')
    )
  ];

  const csvContent = csvRows.join('\r\n');

  // Создаём Blob и инициируем загрузку
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
