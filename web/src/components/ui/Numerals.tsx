import { Fragment } from 'react'

const DIGITS = /(\d+)/

/**
 * Renders the digits inside a plain English sentence in Laroka, per
 * docs/design.md section 4: headings, room codes and numerals use the display
 * font, everything around them stays Plus Jakarta Sans.
 *
 * Example: "49 mins left" keeps the words in the body font and lifts "49".
 */
export function Numerals({ text }: { text: string }) {
  return (
    <>
      {text.split(DIGITS).map((part, index) =>
        DIGITS.test(part) ? (
          <span key={`numeral-${index}`} className="type-numeral">
            {part}
          </span>
        ) : (
          <Fragment key={`words-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  )
}
