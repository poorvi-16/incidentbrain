export type AppSettings = {
  githubToken: string;
  defaultRepo: string;
};

const SETTINGS_KEY = "incidentbrain-settings";

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);

  if (!raw) {
    return {
      githubToken: "",
      defaultRepo: ""
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return {
      githubToken: parsed.githubToken ?? "",
      defaultRepo: parsed.defaultRepo ?? ""
    };
  } catch {
    return {
      githubToken: "",
      defaultRepo: ""
    };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
