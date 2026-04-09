import Script from 'next/script';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * Runs before React / cached bundles: full navigation to /lab/?switch_account=1 wipes Supabase
 * keys and redirects to a clean /lab/. Works even when the old JS bundle ignored logout.
 */
const switchAccountScript = `
(function(){
  try {
    if (new URLSearchParams(window.location.search).get('switch_account') !== '1') return;
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var k = localStorage.key(i);
      if (k && k.indexOf('sb-') === 0) localStorage.removeItem(k);
    }
    localStorage.removeItem('mimic-lab-user');
    sessionStorage.clear();
    var base = ${JSON.stringify(basePath)};
    window.location.replace(window.location.origin + base + '/lab/');
  } catch (e) {}
})();
`;

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="lab-switch-account-clean"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: switchAccountScript }}
      />
      {children}
    </>
  );
}
