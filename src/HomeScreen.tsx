export const HOME_FEATURES = [
  {
    description: (
      <>
        <strong>Les informations présentées sont des estimations</strong> et peuvent varier en fonction des caractéristiques des logements
        et des équipements.
      </>
    ),
    iconClassName: 'fr-icon-pie-chart-box-fill',
    title: 'Estimation',
  },
  {
    description: (
      <>
        Les aides estimées dans les calculs impliquent le <strong>remplacement de la chaudière gaz ou fioul</strong>.
      </>
    ),
    iconClassName: 'fr-icon-money-euro-box-fill',
    title: 'Aides incluses',
  },
  {
    description: <>Les calculs sont simplifiés et ne remplacent pas un devis par un professionnel RGE.</>,
    iconClassName: 'fr-icon-line-chart-fill',
    title: 'Calculs simplifiés',
  },
  {
    description: <>Il est nécessaire d’en parler à un professionnel pour vous faire accompagner en toute neutralité.</>,
    iconClassName: 'fr-icon-chat-3-fill',
    title: 'Faites-vous accompagner',
  },
] as const;

export function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="home-title">
      <p className="fr-badge fr-badge--info fr-badge--no-icon fr-py-1v">
        <span className="fr-icon-time-fill fr-mr-1v" aria-hidden="true" />
        Moins d’une minute
      </p>
      <div className="fr-grid-row fr-mt-5v">
        {HOME_FEATURES.slice(0, 3).map((feature) => (
          <article className="fr-col-12 fr-col-lg-4 fr-p-3w fr-grid-row home-feature" key={feature.title}>
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
      <button className="fr-my-6v fr-btn fr-btn--lg fr-btn--icon-right fr-icon-arrow-right-line" type="button" onClick={onStart}>
        Démarrer la simulation
      </button>
      <p className="fr-mt-3v">
         Pour accéder à un simulateur de solutions de chauffage économiques et durables, plus exhaustif, rendez-vous sur{' '}
        <a
          href="https://france-chaleur-urbaine.beta.gouv.fr/comparateur-couts-performances?utm=electrifionslafrance"
          className="fr-link"
          target="_blank"
          rel="noreferrer"
        >
          France Chaleur Urbaine
        </a>
        .
      </p>
    </section>
  );
}
