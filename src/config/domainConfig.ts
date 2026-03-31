export type DomainConfigEntry = {
  page: string;
  countryId: string;
};

const domainConfig: Record<string, DomainConfigEntry> = {
  localhost: { page: "1", countryId: "1" },
  "dominio2.com": { page: "2", countryId: "1" },
  "sistema.wowassistance.com": { page: "1", countryId: "1" },
  "agentes.wowassistance.com": { page: "1", countryId: "1" },
};

export const getDomainConfig = (hostname: string): DomainConfigEntry => {
  return domainConfig[hostname] || { page: "defaultPage", countryId: "1" };
};
