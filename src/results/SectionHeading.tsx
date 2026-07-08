export function SectionHeading({ iconClassName, title }: { iconClassName: string; title: string }) {
  return (
    <h2 className="fr-h5">
      <span className={iconClassName} aria-hidden="true" /> {title}
    </h2>
  );
}
