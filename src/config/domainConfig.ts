export type DomainConfigEntry = {
  page: string;
  countryId: string;
};

const domainConfig: Record<string, DomainConfigEntry> = {
  localhost: { page: "1", countryId: "1" },
  "vualacrm.com": { page: "1", countryId: "1" },
};

export const getDomainConfig = (hostname: string): DomainConfigEntry => {
  return domainConfig[hostname] || { page: "defaultPage", countryId: "1" };
};
