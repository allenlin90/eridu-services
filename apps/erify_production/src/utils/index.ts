export const toLocaleTimeString = (datetime: string, locale?: Intl.LocalesArgument) => {
  return new Date(datetime).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const toLocaleDateString = (datetime: string, locale: Intl.LocalesArgument = "en-GB") => {
  return new Date(datetime).toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
