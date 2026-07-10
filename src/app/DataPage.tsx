import { ATTRIBUTIONS } from '../data/attribution';

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
            <dl className="flex items-baseline justify-between gap-4">
              <dt className="text-primary text-sm font-semibold">Wainwrights</dt>
              <dd className="font-label text-label text-muted">214 fells</dd>
            </dl>
            <p className="text-secondary mt-2 text-sm leading-6">
              The 214 fells of Alfred Wainwright&rsquo;s{' '}
              <span className="text-primary">
                Pictorial Guides to the Lakeland Fells
              </span>
              , all within the Lake District National Park.
            </p>
          </div>
          <p className="text-muted mt-4 text-sm leading-6">
            Further lists — Munros, Corbetts and others — are planned. Each will arrive
            as data, not as a redesign.
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
              The hill lighting shown for bagged fells uses generated, summit-centred
              profiles clipped to the Lake District boundary. They are approximate
              visual aids, not legal, route or geomorphological boundaries.
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
