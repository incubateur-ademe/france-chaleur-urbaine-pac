import franceRenovLogoUrl from '@/assets/france-renov-logo.svg';
import type { FranceRenovSpace } from '@/types';

import { formatPhoneNumber, getExternalUrl } from './formatters';

type AdvisorCalloutProps = {
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceRequested: boolean;
  isFranceRenovSpaceLoading: boolean;
  onFindFranceRenovSpace: () => void;
};

export function AdvisorCallout({
  franceRenovSpace,
  isFranceRenovSpaceRequested,
  isFranceRenovSpaceLoading,
  onFindFranceRenovSpace,
}: AdvisorCalloutProps) {
  return (
    <aside className="advisor-callout" aria-label="Accompagnement France Rénov’">
      <div>
        <h3>Vous souhaitez aller plus loin ?</h3>
        {isFranceRenovSpaceRequested && isFranceRenovSpaceLoading ? (
          <p>Recherche du conseiller France Rénov’ de votre commune…</p>
        ) : (
          <AdvisorDetails
            franceRenovSpace={franceRenovSpace}
            isFranceRenovSpaceRequested={isFranceRenovSpaceRequested}
            onFindFranceRenovSpace={onFindFranceRenovSpace}
          />
        )}
      </div>
      <img className="advisor-logo" src={franceRenovLogoUrl} alt="France Rénov’" />
    </aside>
  );
}

function AdvisorDetails({
  franceRenovSpace,
  isFranceRenovSpaceRequested,
  onFindFranceRenovSpace,
}: {
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceRequested: boolean;
  onFindFranceRenovSpace: () => void;
}) {
  if (!franceRenovSpace) {
    return (
      <>
        <p>
          Un conseiller France Rénov’ vous accompagne <strong>gratuitement et en toute neutralité</strong>.
        </p>
        {isFranceRenovSpaceRequested ? (
          <a className="fr-btn fr-btn--lg" href="https://france-renov.gouv.fr/preparer-projet/trouver-conseiller">
            Trouver un conseiller France Rénov’
          </a>
        ) : (
          <button className="fr-btn fr-btn--lg" type="button" onClick={onFindFranceRenovSpace}>
            Trouver un conseiller France Rénov’
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <p className="fr-text--lg fr-mb-2w">
        Votre espace France Rénov’ : <strong>{franceRenovSpace.name}</strong>
      </p>
      <address className="fr-mb-3v">
        {franceRenovSpace.address && (
          <div className="fr-grid-row fr-py-2v">
            <div className="fr-col-auto">
              <span className="fr-icon-map-pin-2-fill fr-m-3v" aria-hidden="true" />
            </div>
            <div className="fr-col">
              <span>
                {franceRenovSpace.address}, {franceRenovSpace.zipcode} {franceRenovSpace.city}
              </span>
            </div>
          </div>
        )}
        {franceRenovSpace.phone && (
          <div className="fr-grid-row fr-py-2v">
            <div className="fr-col-auto">
              <span className="fr-icon-phone-fill fr-m-3v" aria-hidden="true" />
            </div>
            <div className="fr-col">
              <a href={`tel:${franceRenovSpace.phone}`}>{formatPhoneNumber(franceRenovSpace.phone)}</a>
              {franceRenovSpace.secondaryPhone && (
                <>
                  <br />
                  <a href={`tel:${franceRenovSpace.secondaryPhone}`}>{formatPhoneNumber(franceRenovSpace.secondaryPhone)}</a>
                </>
              )}
            </div>
          </div>
        )}
        {franceRenovSpace.email && (
          <div className="fr-grid-row fr-py-2v">
            <div className="fr-col-auto">
              <span className="fr-icon-mail-fill fr-m-3v" aria-hidden="true" />
            </div>
            <div className="fr-col">
              <a href={`mailto:${franceRenovSpace.email}`}>{franceRenovSpace.email}</a>
            </div>
          </div>
        )}
      </address>
      <a
        className="fr-btn fr-btn--lg fr-btn--icon-right fr-icon-external-link-line"
        href={franceRenovSpace.website ? getExternalUrl(franceRenovSpace.website) : `mailto:${franceRenovSpace.email}`}
        target={franceRenovSpace.website ? '_blank' : undefined}
        rel={franceRenovSpace.website ? 'noopener noreferrer' : undefined}
      >
        Contacter mon conseiller France Rénov’
      </a>
    </>
  );
}
