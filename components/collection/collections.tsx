"use client";

import { Badge } from "@ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardToolbar,
  CardHeading,
  CardFooter,
} from "@ui/card";
import { Folder, MoreVertCircle } from "iconoir-react";
import { CreateCollectionButton } from "./create-collection-button";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { COLLECTION_COLORS } from "./colors";
import { NavLink } from "react-router";

export function Collections() {
  const collections = useQuery(api.collectionMangament.getUserCollections);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <CreateCollectionButton
          existingCollectionNames={(collections ?? []).map((c) => c.name)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections?.map((collection, index) => {
          const fallbackIndex = index % COLLECTION_COLORS.length;
          const collectionColor =
            collection.collectionColor || COLLECTION_COLORS[fallbackIndex];

          return (
            <Card
              variant="accent"
              key={collection.id}
              className="group hover:border-accent border-border cursor-pointer border transition-all duration-100 ease-in-out hover:border-dashed hover:drop-shadow"
            >
              <NavLink
                to={`/collection/${collection.id}`}
                tabIndex={0}
                className="block h-full"
              >
                <CardHeader className="flex items-start justify-between">
                  <CardHeading className="flex items-center justify-between gap-2">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: collectionColor + "20" }}
                    >
                      <Folder
                        className="h-5 w-5"
                        style={{ color: collectionColor }}
                      />
                    </div>
                    <CardTitle className="font-medium">
                      {collection.name}
                    </CardTitle>
                  </CardHeading>
                  <CardToolbar>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="hover:bg-accent rounded-md p-1 transition-all"
                    >
                      <MoreVertCircle className="h-4 w-4" />
                    </button>
                  </CardToolbar>
                </CardHeader>

                <CardContent className="px-5 pb-0.5">
                  <CardDescription className="mb-5 line-clamp-2 h-[2lh] text-xs">
                    {collection.description} iodsadjaio diao siodasiod lak
                    dakjsdj asjdkl kladkl adkjasjkd askljdk la dajkdaksj dhasjkd
                    jka
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">
                      [{collection.urlCount}]{" "}
                      <span className="text-muted-foreground pl-1 text-xs">
                        {collection.urlCount > 1 ? "links" : "link"}
                      </span>
                    </Badge>
                    <Badge variant="default">
                      [{collection.totalClickCount}]{" "}
                      <span className="text-muted-foreground pl-1 text-xs">
                        {collection.totalClickCount > 1 ? "clicks" : "click"}
                      </span>
                    </Badge>
                  </div>
                </CardFooter>
              </NavLink>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
