declare module 'hanzi-writer' {
  export interface HanziWriterOptions {
    width?: number;
    height?: number;
    padding?: number;
    showOutline?: boolean;
    strokeColor?: string;
    highlightColor?: string;
    outlineColor?: string;
    drawingFadeDuration?: number;
    strokeAnimationSpeed?: number;
    delayBetweenStrokes?: number;
    showCharacter?: boolean;
    radicalColor?: string;
  }

  export default class HanziWriter {
    static create(
      element: HTMLElement | string,
      character: string,
      options?: HanziWriterOptions
    ): HanziWriter;

    animateCharacter(options?: {
      onComplete?: () => void;
      strokeAnimationSpeed?: number;
      delayBetweenStrokes?: number;
    }): void;

    showCharacter(options?: { animationDuration?: number; onComplete?: () => void }): void;
    hideCharacter(options?: { animationDuration?: number; onComplete?: () => void }): void;
    cancelAnimation(): void;
    cancel(): void;
    setCharacter(character: string): Promise<void>;
  }
}
