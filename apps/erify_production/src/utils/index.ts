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

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const generateRandomString = (length = 32) => {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error("Length must be a non-negative integer.");
  }

  const result = [];
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values); // securely fills array with random values

  for (let i = 0; i < length; i++) {
    // map value to index in charset
    result.push(CHARSET[values[i]! % CHARSET.length]);
  }

  return result.join("");
};
