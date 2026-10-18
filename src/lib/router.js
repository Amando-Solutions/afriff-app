import { useEffect, useState } from 'react';

// Tiny page switcher using the part of the address after '#'.
// e.g. #/programme, #/film/harmattan. Works on any static host.
function parse() {
  const path = window.location.hash.replace(/^#/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  return { path, name: parts[0] || 'home', param: parts[1] ? decodeURIComponent(parts[1]) : null };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (path) => {
  window.location.hash = path;
};
