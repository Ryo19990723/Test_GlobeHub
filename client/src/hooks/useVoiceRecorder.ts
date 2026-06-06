import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface UseVoiceRecorderReturn {
  transcript: string;
  interimText: string;
  isRecording: boolean;
  isEditMode: boolean;
  editValue: string;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  reset: () => void;
  handleOpenEdit: () => void;
  handleConfirmEdit: () => void;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
  setTranscriptValue: (v: string) => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setIsSupported(false); return; }

    const recognition = new SR();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current);
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        if (isRecordingRef.current) {
          try { recognition.start(); } catch (e) {}
        }
        return;
      }
      setIsRecording(false);
      isRecordingRef.current = false;
      setInterimText("");
      if (event.error !== "aborted") {
        toast({ title: "音声認識エラー", description: "マイクへのアクセスを確認してください", variant: "destructive" });
      }
    };

    recognition.onend = () => {
      setInterimText("");
      if (isRecordingRef.current) {
        try { recognition.start(); } catch (e) {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [toast]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    finalTranscriptRef.current = transcript;
    setInterimText("");
    setIsEditMode(false);
    setIsRecording(true);
    isRecordingRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  }, [transcript]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    isRecordingRef.current = false;
    recognitionRef.current.stop();
    setIsRecording(false);
    setInterimText("");
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.abort();
    isRecordingRef.current = false;
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
    setIsRecording(false);
    setIsEditMode(false);
    setEditValue("");
  }, []);

  const handleOpenEdit = useCallback(() => {
    setEditValue(transcript);
    setIsEditMode(true);
  }, [transcript]);

  const handleConfirmEdit = useCallback(() => {
    finalTranscriptRef.current = editValue;
    setTranscript(editValue);
    setIsEditMode(false);
  }, [editValue]);

  const setTranscriptValue = useCallback((v: string) => {
    finalTranscriptRef.current = v;
    setTranscript(v);
  }, []);

  return {
    transcript,
    interimText,
    isRecording,
    isEditMode,
    editValue,
    isSupported,
    startRecording,
    stopRecording,
    reset,
    handleOpenEdit,
    handleConfirmEdit,
    setEditValue,
    setTranscriptValue,
  };
}
