/**
 * useVoiceCommand
 *
 * React hook that wraps the Web Speech API for voice command recognition.
 * Accepts a map of command patterns to handler functions. Manages
 * listening state, interim results, and error recovery.
 */

type CommandHandler = (transcript: string) => void;

export function useVoiceCommand(_commands: Record<string, CommandHandler>) {
  // TODO: Initialize SpeechRecognition with language detection
  // TODO: Match transcripts against command patterns
  // TODO: Support continuous listening mode
  // TODO: Handle browser compatibility (Chrome, Safari, Firefox)
  // TODO: Return { isListening, startListening, stopListening, lastTranscript }

  return {
    isListening: false,
    startListening: () => {},
    stopListening: () => {},
    lastTranscript: '',
  };
}
