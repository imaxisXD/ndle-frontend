"use client";

import { Component, type ReactNode } from "react";

/* For live extras on public pages, like the landing page's click total: if
   the part inside fails (a Convex query throws, for one), show `fallback`
   instead and leave the rest of the page standing. Convex's useQuery throws
   on errors, and without a boundary one failed query takes down the page. */

type Props = { children: ReactNode; fallback: ReactNode; label: string };

export class QuietBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.label} failed; showing its fallback.`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
