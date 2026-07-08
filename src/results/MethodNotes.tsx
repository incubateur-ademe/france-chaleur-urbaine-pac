import { HOME_FEATURES } from '@/HomeScreen';

export function MethodNotes() {
  return (
    <div className="fr-grid-row fr-mt-5v">
      {HOME_FEATURES.map((feature) => (
        <article className="fr-col-12 fr-col-lg-6 fr-p-3w fr-grid-row home-feature" key={feature.title}>
          <div className="fr-col-auto">
            <span className={`${feature.iconClassName} fr-icon--lg`} aria-hidden="true" />
          </div>
          <div className="fr-col fr-pl-3v">
            <h2 className="fr-h6 fr-mb-3v fr-mt-1v">{feature.title}</h2>
            <p className="fr-mb-0">{feature.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
