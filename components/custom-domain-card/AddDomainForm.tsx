"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { PlusIcon, SpinnerIcon } from "@phosphor-icons/react/dist/ssr";

// Validation schema for domain input
const domainFormSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Domain is required")
    .refine(
      (val) => {
        // Normalize the value first to check the actual domain
        let normalized = val.toLowerCase().trim();
        normalized = normalized.replace(/^https?:\/\//, "");
        normalized = normalized.replace(/^www\./, "");
        normalized = normalized.split("/")[0];

        // Check if it's a valid domain pattern
        const domainPattern =
          /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return domainPattern.test(normalized);
      },
      {
        message: "Please enter a valid domain (e.g., links.yourdomain.com)",
      },
    ),
});

type DomainFormValues = z.infer<typeof domainFormSchema>;

interface AddDomainFormProps {
  onSuccess?: () => void;
}

/**
 * Form component for adding a new custom domain
 * Uses React Hook Form with Zod validation
 */
export function AddDomainForm({ onSuccess }: AddDomainFormProps) {
  const addDomain = useMutation(api.customDomains.addDomain);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainFormSchema),
    mode: "onSubmit",
    defaultValues: {
      domain: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: DomainFormValues) => {
    try {
      const result = await addDomain({ domain: values.domain });
      if (result.success && result.domainId) {
        toast.success("Domain added! Cloudflare registration in progress.");
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to add domain");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full items-start gap-2 py-4"
      >
        <FormField
          control={form.control}
          name="domain"
          render={({ field, fieldState }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  className={cn(
                    "border-border rounded-md border bg-white",
                    fieldState.invalid && "border-red-300 ring-1 ring-red-200",
                  )}
                  placeholder="links.yourdomain.com"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !form.watch("domain")?.trim() ||
              form.formState.errors.domain !== undefined
            }
            className="shrink-0 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <SpinnerIcon className="mr-1.5 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <PlusIcon className="mr-1.5 h-4 w-4" />
                Add Domain
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
