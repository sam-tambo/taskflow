import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFormBySlug, useSubmitForm } from '@/hooks/useForms';
import { cn } from '@/lib/utils';
import { CheckSquare } from 'lucide-react';
import type { FormField } from '@/types';

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const { data: form, isLoading, error } = useFormBySlug(slug);
  const submitForm = useSubmitForm(form?.id ?? '');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const setValue = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    if (!form) return false;
    const newErrors: Record<string, string> = {};
    for (const field of form.fields) {
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === '' || val === null || val === false) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !validate()) return;
    try {
      await submitForm.mutateAsync({ submittedData: formData, form });
      setSubmitted(true);
    } catch {
      // Error handled by mutation onError
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Form not found</h1>
          <p className="text-gray-500 dark:text-gray-400">This form may no longer be available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center px-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckSquare className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
              {form.success_message || 'Thank you! Your submission has been received.'}
            </h1>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 py-12 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 p-8">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{form.title}</h1>
            {form.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{form.description}</p>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              {form.fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  error={errors[field.id]}
                  onChange={(val) => setValue(field.id, val)}
                />
              ))}
              <button
                type="submit"
                disabled={submitForm.isPending}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitForm.isPending ? 'Submitting...' : form.submit_button_text || 'Submit'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: any;
  error?: string;
  onChange: (val: any) => void;
}) {
  const inputClasses = cn(
    'w-full border rounded-lg px-3 py-2 text-sm transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
    error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-200',
    'focus:outline-none focus:ring-2'
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.type === 'text' && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClasses}
        />
      )}
      {field.type === 'textarea' && (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={inputClasses}
        />
      )}
      {field.type === 'email' && (
        <input
          type="email"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClasses}
        />
      )}
      {field.type === 'select' && (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {field.type === 'date' && (
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        />
      )}
      {field.type === 'checkbox' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{field.placeholder || field.label}</span>
        </label>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Footer() {
  return (
    <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
      Powered by <span className="font-medium text-gray-500 dark:text-gray-400">Revenue Precision</span>
    </div>
  );
}
