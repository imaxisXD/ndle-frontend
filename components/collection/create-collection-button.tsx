import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/base-dialog";
import { HotkeyButton } from "../ui/hotkey-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { getRandomCollectionColor } from "./colors";
import { ColorSelector } from "./ColorSelector";
import { getWindowsFolderNameError } from "@/lib/utils";
import { trackCollectionCreated } from "@/lib/posthog";

const collectionFormSchema = z.object({
  name: z
    .string()
    .min(1, "Collection name is required")
    .max(50, "Collection name must be less than 50 characters")
    .superRefine((val, ctx) => {
      const err = getWindowsFolderNameError(val);
      if (err) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
      }
    }),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  collectionColor: z.string().optional(),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

type CreateCollectionButtonProps = {
  existingCollectionNames: Array<string>;
};

export function CreateCollectionButton({
  existingCollectionNames,
}: CreateCollectionButtonProps) {
  const addToast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const createCollection = useMutation(
    api.collectionMangament.createCollection,
  );

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      collectionColor: undefined,
    },
  });

  const handleCreateCollection = async (values: CollectionFormValues) => {
    const normalized = values.name.trim().toLowerCase();
    const exists = (existingCollectionNames || []).some(
      (n) => (n || "").trim().toLowerCase() === normalized,
    );
    if (exists) {
      addToast.add({
        title: "Duplicate name",
        description: "You already have that collection",
        type: "error",
      });
      form.setError("name", { message: "You already have that collection" });
      return;
    }

    const colorToSend = values.collectionColor || getRandomCollectionColor();
    await createCollection({
      name: values.name,
      description: values.description || "",
      collectionColor: colorToSend,
    });
    trackCollectionCreated();
    addToast.add({
      title: "Collection created",
      description: "Your new collection has been created",
      type: "success",
    });
    form.reset();
    setShowCreateModal(false);
  };

  return (
    <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
      <DialogTrigger
        render={
          <HotkeyButton
            type="button"
            variant="default"
            hotkey="n"
            enabled={!showCreateModal}
            onClick={() => setShowCreateModal(true)}
          >
            Create Collection
          </HotkeyButton>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-0.5 bg-transparent">
          <DialogTitle className="text-lg font-medium">
            Create New Collection
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Organize your links into a new collection
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateCollection)}
            className="space-y-4 pt-10"
          >
            <FormField
              control={form.control}
              name="collectionColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <ColorSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Product Documentation"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description e.g. Product Documentation, Personal Links, etc."
                      className="resize-none bg-white"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  form.reset();
                }}
                className="border-border"
              >
                Cancel
              </Button>
              <HotkeyButton
                type="submit"
                disabled={
                  form.formState.isSubmitting ||
                  !form.watch("name")?.trim() ||
                  !!form.formState.errors.name ||
                  !!form.formState.errors.description ||
                  !!form.formState.errors.collectionColor ||
                  !form.formState.isValid
                }
                hotkey="meta+enter"
                onClick={() => {
                  form.handleSubmit(handleCreateCollection)();
                }}
                className="disabled:opacity-70"
              >
                {form.formState.isSubmitting
                  ? "Creating..."
                  : "Create Collection"}
              </HotkeyButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
