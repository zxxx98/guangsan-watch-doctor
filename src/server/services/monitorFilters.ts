type DoctorSummary = {
  name: string;
};

export function normalizeDoctorKeyword(keyword?: string | null): string {
  return keyword?.trim().toLowerCase() || '';
}

export function filterDoctorNotifications<T extends DoctorSummary>(doctors: T[], keyword?: string | null): T[] {
  const normalizedKeyword = normalizeDoctorKeyword(keyword);
  if (!normalizedKeyword) {
    return doctors;
  }

  return doctors.filter((doctor) => doctor.name.trim().toLowerCase().includes(normalizedKeyword));
}

export function shouldStopMonitoring(options: { stopOnAvailable?: boolean; totalRemain: number }): boolean {
  return options.stopOnAvailable !== false && options.totalRemain > 0;
}
