"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  EmptyStateImage,
  type EmptyStateImageName,
} from "@/components/empty-state-image";

type RouteStateBoundaryProps = {
  children: ReactNode;
  description: string;
  imageName: EmptyStateImageName;
  resetKey?: string;
  title: string;
};

type RouteStateBoundaryState = {
  didFail: boolean;
};

export class RouteStateBoundary extends Component<
  RouteStateBoundaryProps,
  RouteStateBoundaryState
> {
  state: RouteStateBoundaryState = {
    didFail: false,
  };

  static getDerivedStateFromError(): RouteStateBoundaryState {
    return { didFail: true };
  }

  componentDidUpdate(prevProps: RouteStateBoundaryProps) {
    if (this.state.didFail && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ didFail: false });
    }
  }

  componentDidCatch(error: unknown) {
    console.error(`${this.props.title}:`, error);
  }

  render() {
    if (this.state.didFail) {
      return (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <EmptyStateImage
            alt=""
            className="mb-5 w-full max-w-[680px]"
            name={this.props.imageName}
          />
          <h3 className="text-foreground text-sm font-medium">
            {this.props.title}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md text-xs">
            {this.props.description}
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            onClick={() => this.setState({ didFail: false })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
