import { lazy, Suspense, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export function ReactionPicker({ onSelect }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="text-gray-400 hover:text-gray-600 text-sm px-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Add reaction"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" />
          <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <FloatingPortal>
          <div
            // eslint-disable-next-line react-hooks/refs
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50"
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center" style={{ width: 300, height: 350 }}>
                  <span className="text-sm text-gray-400">Loading…</span>
                </div>
              }
            >
              <EmojiPicker
                theme={"light" as const}
                height={350}
                width={300}
                searchPlaceholder="Search emoji..."
                onEmojiClick={(emojiData: EmojiClickData) => {
                  onSelect(emojiData.emoji);
                  setOpen(false);
                }}
              />
            </Suspense>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
