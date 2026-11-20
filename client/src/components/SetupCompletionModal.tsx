/**
 * Setup Completion Modal — Minimum Viable Onboarding (MVO)
 *
 * Triggered automatically after account creation when the website extraction
 * did not find all required business information for the selected industry.
 *
 * Pre-fills every field with whatever was successfully extracted.
 * Required fields that are still empty are highlighted in amber so the user
 * can see exactly what the AI is missing — and fill it in quickly.
 *
 * This prevents the AI from hallucinating services, hours, or policies that
 * the business does not actually have.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  getRequiredFieldsForIndustry,
  type RequiredField,
} from "@shared/requiredFieldsByIndustry";
import { getShadowDataForIndustry } from "@shared/industryShadowData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SetupCompletionProps {
  open: boolean;
  onClose: () => void;
  agentId: string;
  businessName: string;
  industry: string;
  confidenceScore: number;
  /** Keys of required fields that were NOT found during extraction */
  missingFields: string[];
  /** Keys of required fields that WERE found — used to show "✓" badges */
  foundFields?: string[];
  /** Pre-extracted values indexed by field key — pre-fill form inputs */
  prefillData?: Record<string, string>;
}

const formSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessHours: z.string().optional(),
  pricingModel: z.string().optional(),
  aboutDescription: z.string().optional(),
  websiteUrl: z.string().optional(),
  callGoal: z.string().min(1, "Please describe the #1 reason people call you"),
  selectedServices: z.array(z.string()).min(1, "Please select at least one service"),
});

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Field state helpers
// ─────────────────────────────────────────────────────────────────────────────

type FieldStatus = 'found' | 'missing-required' | 'empty-optional';

function getFieldStatus(
  fieldKey: string,
  missingFields: string[],
  foundFields: string[]
): FieldStatus {
  if (foundFields.includes(fieldKey)) return 'found';
  if (missingFields.includes(fieldKey)) return 'missing-required';
  return 'empty-optional';
}

// CSS for each state
const FIELD_STYLES: Record<FieldStatus, { input: string; label: string; badge?: string }> = {
  'found': {
    input: 'border-emerald-500/50 bg-emerald-500/5 focus:ring-emerald-500/30',
    label: 'text-emerald-400',
    badge: 'found',
  },
  'missing-required': {
    input: 'border-amber-400/70 bg-amber-400/5 focus:ring-amber-400/30',
    label: 'text-amber-400',
    badge: 'required',
  },
  'empty-optional': {
    input: '',
    label: '',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = ['Vitals', 'Knowledge Gaps', 'Service Menu', 'Call Goal'] as const;
type StepName = (typeof STEPS)[number];

// Which required field keys belong to each step
const STEP_FIELD_KEYS: Record<StepName, string[]> = {
  'Vitals': ['phone', 'address', 'hours'],
  'Knowledge Gaps': [], // dynamically populated from industry-specific fields
  'Service Menu': ['services'],
  'Call Goal': ['ordering_options', 'walk_in_policy', 'appointment_policy', 'enrollment_process', 'service_type', 'emergency_protocol', 'emergency_availability', 'accepting_new_patients'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SetupCompletionModal({
  open,
  onClose,
  agentId,
  businessName,
  industry,
  confidenceScore,
  missingFields,
  foundFields = [],
  prefillData = {},
}: SetupCompletionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const shadow = getShadowDataForIndustry(industry);
  const allRequiredFields = getRequiredFieldsForIndustry(industry);

  // Industry-specific fields that appear in step 2 (Knowledge Gaps)
  const knowledgeGapFields = allRequiredFields.filter(f =>
    !STEP_FIELD_KEYS['Vitals'].includes(f.key) &&
    !STEP_FIELD_KEYS['Service Menu'].includes(f.key) &&
    !STEP_FIELD_KEYS['Call Goal'].includes(f.key)
  );

  // Pre-fill form from extracted data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: prefillData['businessName'] || businessName,
      phone: prefillData['phone'] || '',
      address: prefillData['address'] || '',
      businessHours: prefillData['hours'] || '',
      pricingModel: prefillData['service_pricing'] || prefillData['membership_pricing'] || prefillData['daycare_pricing'] || prefillData['consultation_policy'] || prefillData['consultation_structure'] || '',
      aboutDescription: prefillData['menu_categories'] || prefillData['class_types'] || prefillData['treatment_menu'] || prefillData['practice_areas'] || prefillData['programs_offered'] || prefillData['specific_services'] || prefillData['insurance_accepted'] || prefillData['dental_insurance'] || prefillData['animal_types'] || prefillData['amenities'] || prefillData['makes_accepted'] || prefillData['service_area'] || prefillData['vaccination_requirements'] || prefillData['product_categories'] || '',
      callGoal: prefillData['ordering_options'] || prefillData['walk_in_policy'] || prefillData['appointment_policy'] || prefillData['enrollment_process'] || prefillData['service_type'] || prefillData['emergency_protocol'] || prefillData['emergency_availability'] || prefillData['accepting_new_patients'] || shadow.callGoalSuggestion,
      selectedServices: prefillData['services']
        ? prefillData['services'].split(',').map(s => s.trim()).filter(Boolean)
        : [],
    },
  });

  // Sync selected services with form
  useEffect(() => {
    const pre = prefillData['services']
      ? prefillData['services'].split(',').map(s => s.trim()).filter(Boolean)
      : [];
    setSelectedServices(pre);
    form.setValue('selectedServices', pre);
  }, [prefillData]);

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return apiRequest('POST', `/api/business/complete-onboarding/${agentId}`, {
        businessName: values.businessName,
        phone: values.phone,
        address: values.address,
        businessHours: values.businessHours,
        pricingModel: values.pricingModel,
        aboutDescription: values.aboutDescription,
        callGoal: values.callGoal,
        selectedServices: values.selectedServices,
        industry,
      });
    },
    onSuccess: () => {
      toast({
        title: "Agent updated!",
        description: "Your AI receptionist now has everything it needs to handle calls accurately.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant'] });
      // Clear the MVO session flag
      sessionStorage.removeItem('mvoSetupRequired');
      onClose();
    },
    onError: () => {
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    },
  });

  const currentStepName = STEPS[step];
  const missingCount = missingFields.length;
  const totalRequired = allRequiredFields.length;
  const filledCount = totalRequired - missingCount;
  const progressPct = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 100;

  function toggleService(service: string) {
    const updated = selectedServices.includes(service)
      ? selectedServices.filter(s => s !== service)
      : [...selectedServices, service];
    setSelectedServices(updated);
    form.setValue('selectedServices', updated);
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else form.handleSubmit(v => submitMutation.mutate(v))();
  }

  // ── Field rendering helpers ─────────────────────────────────────────────────

  function FieldLabel({
    fieldKey,
    children,
    required = false,
  }: {
    fieldKey: string;
    children: React.ReactNode;
    required?: boolean;
  }) {
    const status = getFieldStatus(fieldKey, missingFields, foundFields);
    const styles = FIELD_STYLES[status];

    return (
      <div className="flex items-center gap-2 mb-1">
        <Label className={`text-sm font-medium ${styles.label}`}>{children}</Label>
        {status === 'found' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle className="w-3 h-3" /> From your website
          </span>
        )}
        {status === 'missing-required' && (
          <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
            <AlertCircle className="w-3 h-3" /> Required
          </span>
        )}
      </div>
    );
  }

  function inputClass(fieldKey: string, base = '') {
    const status = getFieldStatus(fieldKey, missingFields, foundFields);
    return `${base} ${FIELD_STYLES[status].input}`.trim();
  }

  // ── Step content ───────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={open ? undefined : onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Step {step + 1} of {STEPS.length}
              </Badge>
              <Badge
                className={`text-xs ${confidenceScore >= 75 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'} border`}
              >
                {filledCount}/{totalRequired} fields found
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">~2 min</span>
          </div>

          <DialogTitle className="text-base font-semibold">
            {currentStepName === 'Vitals' && '📍 Confirm your business details'}
            {currentStepName === 'Knowledge Gaps' && '⚡ Fill in the gaps your AI needs'}
            {currentStepName === 'Service Menu' && '📋 Confirm your services'}
            {currentStepName === 'Call Goal' && '🎯 Set your AI\'s top priority'}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {currentStepName === 'Vitals' && (
              <>
                <span className="text-emerald-400 font-medium">Green = found from your website.</span>{' '}
                <span className="text-amber-400 font-medium">Amber = missing — your AI needs this to avoid wrong answers.</span>
              </>
            )}
            {currentStepName === 'Knowledge Gaps' && knowledgeGapFields.length > 0 &&
              `We couldn't find ${missingFields.filter(k => knowledgeGapFields.map(f => f.key).includes(k)).length} field(s) specific to ${industry.replace(/_/g, ' ')} businesses. Empty fields = your AI will guess.`}
            {currentStepName === 'Knowledge Gaps' && knowledgeGapFields.length === 0 &&
              'No industry-specific gaps detected. Your agent has good coverage for this step.'}
            {currentStepName === 'Service Menu' &&
              'Check off only the services you actually offer. Unchecked services will not appear in your agent\'s vocabulary.'}
            {currentStepName === 'Call Goal' &&
              'This sets the Priority 1 node in your conversation flow — the first thing your AI tries to help with.'}
          </DialogDescription>

          {/* Overall fill progress */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Setup completeness</span>
              <span>{progressPct}%</span>
            </div>
            <Progress
              value={progressPct}
              className={`h-1.5 ${progressPct >= 75 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-400'}`}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* ── Step 1: Vitals ──────────────────────────────────────────────── */}
          {currentStepName === 'Vitals' && (
            <div className="space-y-3">
              {/* Business Name */}
              <div>
                <FieldLabel fieldKey="businessName">Business Name *</FieldLabel>
                <Input
                  className={inputClass('businessName')}
                  {...form.register('businessName')}
                  placeholder="Your Business Name"
                />
                {form.formState.errors.businessName && (
                  <p className="text-xs text-red-400 mt-0.5">{form.formState.errors.businessName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <FieldLabel fieldKey="phone">Phone Number</FieldLabel>
                <Input
                  className={inputClass('phone')}
                  type="tel"
                  {...form.register('phone')}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Address */}
              <div>
                <FieldLabel fieldKey="address">Physical Address</FieldLabel>
                <Input
                  className={inputClass('address')}
                  {...form.register('address')}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              {/* Hours */}
              <div>
                <FieldLabel fieldKey="hours">Business Hours</FieldLabel>
                <Input
                  className={inputClass('hours')}
                  {...form.register('businessHours')}
                  placeholder="Mon–Fri 9am–6pm, Sat 10am–4pm, Sun Closed"
                />
                {missingFields.includes('hours') && (
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    ⚠ Your agent is currently using a 9am–5pm placeholder. Update this to avoid giving callers wrong hours.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Knowledge Gaps ──────────────────────────────────────── */}
          {currentStepName === 'Knowledge Gaps' && (
            <div className="space-y-4">
              {knowledgeGapFields.length === 0 ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-emerald-400 font-medium">All industry fields found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your website had good coverage for {industry.replace(/_/g, ' ')} businesses.
                  </p>
                </div>
              ) : (
                knowledgeGapFields.map((field: RequiredField) => {
                  const status = getFieldStatus(field.key, missingFields, foundFields);
                  const prefilled = prefillData[field.key];

                  return (
                    <div key={field.key}>
                      <FieldLabel fieldKey={field.key}>{field.label}</FieldLabel>
                      {status === 'missing-required' && (
                        <p className="text-xs text-muted-foreground mb-1">{field.whyNeeded}</p>
                      )}
                      {field.formField === 'aboutDescription' || field.inputType === 'textarea' ? (
                        <Textarea
                          rows={3}
                          className={inputClass(field.key)}
                          defaultValue={prefilled || ''}
                          placeholder={field.placeholder}
                          onChange={e => form.setValue('aboutDescription', e.target.value)}
                        />
                      ) : field.formField === 'pricingModel' ? (
                        <Input
                          className={inputClass(field.key)}
                          defaultValue={prefilled || ''}
                          placeholder={field.placeholder}
                          onChange={e => form.setValue('pricingModel', e.target.value)}
                        />
                      ) : (
                        <Input
                          className={inputClass(field.key)}
                          defaultValue={prefilled || ''}
                          placeholder={field.placeholder}
                          onChange={e => form.setValue('callGoal', e.target.value)}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Step 3: Service Menu ────────────────────────────────────────── */}
          {currentStepName === 'Service Menu' && (
            <div className="space-y-3">
              {missingFields.includes('services') && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  No services were found on your website. Select only the services you <strong>actually offer</strong> — unchecked items will not appear in your agent.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {shadow.defaultServices.map(service => {
                  const isSelected = selectedServices.includes(service);
                  const wasPreFilled = (prefillData['services'] || '').toLowerCase().includes(service.toLowerCase());
                  return (
                    <label
                      key={service}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition-colors ${
                        isSelected
                          ? wasPreFilled
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                            : 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleService(service)}
                        className="flex-shrink-0"
                      />
                      <span className="truncate">{service}</span>
                      {wasPreFilled && isSelected && (
                        <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 ml-auto" />
                      )}
                    </label>
                  );
                })}
              </div>

              {form.formState.errors.selectedServices && (
                <p className="text-xs text-red-400">{form.formState.errors.selectedServices.message}</p>
              )}

              {/* Custom service add */}
              <div>
                <Label className="text-xs text-muted-foreground">Not listed? Add a service (press Enter):</Label>
                <Input
                  className="mt-1 text-sm"
                  placeholder="e.g. Custom Catering, Mobile Service"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !selectedServices.includes(val)) {
                        toggleService(val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Step 4: Call Goal ───────────────────────────────────────────── */}
          {currentStepName === 'Call Goal' && (
            <div className="space-y-4">
              <div>
                <FieldLabel fieldKey="callGoal">
                  What is the #1 reason people call you? *
                </FieldLabel>
                <Textarea
                  rows={3}
                  className={inputClass('callGoal')}
                  {...form.register('callGoal')}
                  placeholder="e.g. Book an appointment / Place an order / Ask about pricing"
                />
                {form.formState.errors.callGoal && (
                  <p className="text-xs text-red-400 mt-0.5">{form.formState.errors.callGoal.message}</p>
                )}
              </div>

              {/* Suggestion chips from shadow data */}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  Common for {industry.replace(/_/g, ' ')} businesses — tap to use:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {shadow.commonCallReasons.map(reason => (
                    <button
                      key={reason}
                      type="button"
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors text-left"
                      onClick={() => form.setValue('callGoal', reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              {confidenceScore < 45 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                  <strong>Draft mode:</strong> Your agent will launch with standard {industry.replace(/_/g, ' ')} industry defaults for any fields you leave empty. You can update them anytime in Settings.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-3 border-t mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            disabled={submitMutation.isPending}
          >
            {step === 0 ? 'Skip for now' : '← Back'}
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={submitMutation.isPending}
            className={missingCount > 0 && step === STEPS.length - 1 ? 'bg-amber-500 hover:bg-amber-400 text-black' : ''}
          >
            {submitMutation.isPending
              ? 'Saving...'
              : step < STEPS.length - 1
              ? 'Next →'
              : missingCount > 0
              ? `Complete Setup (${missingCount} field${missingCount !== 1 ? 's' : ''} still empty)`
              : 'Finish Setup ✓'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
