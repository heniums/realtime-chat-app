# Product Guidelines

## Tone & Voice
- **Approach:** Casual, friendly, and approachable. This is a learning project — copy should feel human, not corporate.
- **Clarity over cleverness:** Labels, button text, and error messages should be immediately understandable. Avoid jargon.
- **Encouraging:** When something goes wrong (e.g., connection lost), guide the user gently rather than alarming them.

## Branding
- **Identity:** No formal brand. The app is a neutral, modern chat interface.
- **Color palette:** Dark-mode-first with neutral grays, subtle accents for user avatars/room indicators. Tailwind's default palette is acceptable.
- **Typography:** System font stack (`system-ui, -apple-system, sans-serif`) for zero-latency loading and native feel.

## UX Principles
- **Instant feedback:** Every user action must have an immediate visual response. Messages appear instantly; typing indicators show within milliseconds.
- **Real-time first:** The UI should feel alive. Presence changes, new messages, and reactions should animate smoothly into view.
- **Minimal chrome:** Maximize content area. Hide unnecessary UI until needed.
- **Responsive:** Layout should adapt gracefully from desktop to tablet sizes. No mobile-native requirements, but the web client should remain usable on mobile browsers.

## Accessibility
- **Keyboard navigation:** All interactive elements (rooms, messages, reaction buttons) must be reachable via Tab.
- **Color contrast:** Ensure text meets WCAG AA contrast ratios against backgrounds.
- **Motion respect:** Honor `prefers-reduced-motion` for any entrance/exit animations.

## Component Patterns
- **Buttons:** Rounded rectangles with clear hover/focus states. Primary actions use a solid fill; secondary actions use subtle borders.
- **Inputs:** Clean underlines or minimal bordered boxes. Show focus rings.
- **Cards/Rooms:** Subtle separation via background shifts or light borders, not heavy drop shadows.
- **Reactions:** Compact emoji pills that expand on hover to show who reacted.
