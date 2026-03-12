const DEFAULTS = {
  model: "gpt-5-4-thinking",
  tempChat: false,
  prompt: `Make a summary of this video as you see fit. Use great formatting!

Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`,
};

if (typeof window !== "undefined") {
  window.DEFAULTS = DEFAULTS;
}
export { DEFAULTS };
