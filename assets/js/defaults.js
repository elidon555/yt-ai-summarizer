const DEFAULTS = {
  incognito: false,
  prompt: `Make a summary of this video as you see fit. Use great formatting!

Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`,
};

if (typeof window !== "undefined") {
  window.DEFAULTS = DEFAULTS;
}
