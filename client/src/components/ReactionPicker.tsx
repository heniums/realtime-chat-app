import { useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
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
        😀
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
            <EmojiPicker
              theme={Theme.LIGHT}
              height={350}
              width={300}
              searchPlaceholder="Search emoji..."
              onEmojiClick={(emojiData: EmojiClickData) => {
                onSelect(emojiData.emoji);
                setOpen(false);
              }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
