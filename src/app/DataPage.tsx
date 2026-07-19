import { ATTRIBUTIONS } from '../data/attribution';
import { HILL_LISTS } from '../data/lists';

export function DataPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <p className="font-label text-label text-muted">Source data</p>
      <h1 className="text-primary mt-2 text-3xl font-semibold">Data</h1>
      <p className="text-secondary mt-4 max-w-2xl text-sm leading-6">
        Munro renders committed, reviewed static data. Nothing is fetched from hidden
        services, and your progress record never leaves this browser.
      </p>

      <div className="mt-8 space-y-6">
        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">Supported hill lists</h2>
          <div className="border-line mt-4 border p-4">
            {/* Rendered from the same registry the tracker uses, so a new
                list appears here without a page edit. */}
            <dl className="space-y-2">
              {HILL_LISTS.map((list) => (
                <div
                  key={list.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <dt className="text-primary text-sm font-semibold">{list.name}</dt>
                  <dd className="font-label text-label text-muted text-right">
                    {list.regionLabel}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-muted mt-4 text-sm leading-6">
            The published lists overlap — a Wainwright can also be a Hewitt and a
            Marilyn — so the default <span className="text-primary">All peaks</span>{' '}
            view holds one record per distinct hill, merged from every list above.
            Bagging a peak anywhere counts for every list that contains it.
          </p>
        </section>

        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">
            Data sources and limitations
          </h2>
          <ul className="text-secondary mt-4 space-y-3 text-sm leading-6">
            <li>
              Peak names, heights and positions come from the Database of British and
              Irish Hills (DoBIH). Peaks are treated as summit points, not boundaries.
            </li>
            <li>
              Every hill is presented at its authoritative summit point. Historical
              generated profile polygons remain in the data pipeline for compatibility,
              but Munro does not present them as real hill shapes.
            </li>
            <li>
              The Lake District National Park boundary comes from Natural England open
              data, simplified for map display.
            </li>
          </ul>
        </section>

        <section className="border-line bg-panel border p-5">
          <h2 className="text-primary text-xl font-semibold">Attribution</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Munro is built on open data. Full attribution:
          </p>
          <ul className="mt-4 space-y-3">
            {ATTRIBUTIONS.map((attribution) => (
              <li key={attribution.url}>
                <a
                  className="text-secondary hover:text-primary focus-visible:outline-bagged decoration-line block text-sm leading-6 underline underline-offset-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  href={attribution.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {attribution.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
