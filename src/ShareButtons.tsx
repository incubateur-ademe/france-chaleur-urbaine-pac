export function ShareButtons({ url }: { url: string }) {
  const emailBody = `Bonjour,\n\nVoici une simulation pompe à chaleur air/eau à consulter : ${url}`;
  const emailHref = `mailto:?subject=${encodeURIComponent('Simulation pompe à chaleur air/eau')}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="fr-share fr-mt-6w">
      <p className="fr-share__title">Partager la page</p>
      <ul className="fr-btns-group">
        <li>
          <a href={emailHref} target="_blank" rel="noopener external" className="fr-btn fr-btn--mail">
            Partager par email
          </a>
        </li>
        <li>
          <button
            onClick={() =>
              navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Adresse copiée dans le presse papier.');
              })
            }
            type="button"
            className="fr-btn--copy fr-btn"
          >
            Copier dans le presse-papier
          </button>
        </li>
      </ul>
    </div>
  );
}
