const GOOGLE_CLOUD_CONSOLE_URL = "https://console.cloud.google.com/";

function renderStepText(text: string) {
  const parts = text.split(/(Google Cloud Console)/g);
  return parts.map((part, index) =>
    part === "Google Cloud Console" ? (
      <a
        key={index}
        href={GOOGLE_CLOUD_CONSOLE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline"
      >
        Google Cloud Console
      </a>
    ) : (
      part
    ),
  );
}

function parseHelpSteps(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s*/, ""));
}

type ConnectHelpStepsProps = {
  text: string;
  className?: string;
};

export function ConnectHelpSteps({ text, className }: ConnectHelpStepsProps) {
  const steps = parseHelpSteps(text);
  if (steps.length === 0) return null;

  return (
    <ol className={className ?? "list-decimal space-y-3 pl-5 text-sm text-muted"}>
      {steps.map((step, index) => (
        <li key={index} className="pl-1 leading-relaxed">
          {renderStepText(step)}
        </li>
      ))}
    </ol>
  );
}
