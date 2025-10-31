import React, { useState, useEffect, useRef } from 'react';
import { EditableEntityConfig, FormFieldConfig } from '@/lib/entityConfig';

interface EditRecordModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  item: T | null;
  config: EditableEntityConfig<T>;
  mode: 'create' | 'edit';
  onSave: (data: Partial<T>) => Promise<void>;
}

export function EditRecordModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  item,
  config,
  mode,
  onSave,
}: EditRecordModalProps<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Drag state (desktop only)
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const onHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Enable drag only on non-touch large screens
    if (window.innerWidth < 768) return;
    if (!panelRef.current) return;
    isDraggingRef.current = true;
    // Record offset between pointer and current position
    dragOffsetRef.current = {
      x: e.clientX - dragPos.x,
      y: e.clientY - dragPos.y,
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp, { once: true });
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !panelRef.current) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = panelRef.current.getBoundingClientRect();
    const panelWidth = rect.width;
    const panelHeight = rect.height;

    let nextX = e.clientX - dragOffsetRef.current.x;
    let nextY = e.clientY - dragOffsetRef.current.y;

    // Clamp within viewport (relative to centered origin via transform)
    const maxX = viewportWidth - panelWidth / 2;
    const minX = -maxX;
    const maxY = viewportHeight - panelHeight / 2;
    const minY = -maxY;

    if (nextX > maxX) nextX = maxX;
    if (nextX < minX) nextX = minX;
    if (nextY > maxY) nextY = maxY;
    if (nextY < minY) nextY = minY;

    setDragPos({ x: nextX, y: nextY });
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', onMouseMove);
  };

  // Initialize form data when modal opens or item changes
  useEffect(() => {
    if (isOpen) {
      // Reset drag position when modal opens
      setDragPos({ x: 0, y: 0 });
      
      if (mode === 'edit' && item) {
        const formDataToSet = { ...item };
        setFormData(formDataToSet);
      } else {
        // Initialize with empty values for create mode
        const initialData: Partial<T> = {};
        if (config.editableFields) {
          config.editableFields.forEach(field => {
            // For prompts, set prompt_active to true by default in create mode
            if (config.title === 'Prompts' && field.key === 'prompt_active' && field.type === 'boolean') {
              initialData[field.key] = true as any;
            } else {
              initialData[field.key] = (field.type === 'boolean' ? false : '') as any;
            }
          });
        }
        setFormData(initialData);
      }
      setErrors({});
      setSaveError(null);
    }
  }, [isOpen, item, mode, config]);

  if (!isOpen) return null;

  const validateField = (key: string, value: any, fieldConfig: FormFieldConfig<T>): string | null => {
    // Required validation
    if (fieldConfig.required && (value === null || value === '' || value === undefined)) {
      return `${fieldConfig.label} is required`;
    }

    // Skip further validation if field is empty and not required
    if (!value && !fieldConfig.required) {
      return null;
    }

    // Type-specific validation
    if (fieldConfig.type === 'email' && value) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    // Validation rules
    if (fieldConfig.validation) {
      const validation = fieldConfig.validation;

      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          return `${fieldConfig.label} must be at least ${validation.minLength} characters`;
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `${fieldConfig.label} must be at most ${validation.maxLength} characters`;
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          return `Invalid format for ${fieldConfig.label}`;
        }
      }

      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          return `${fieldConfig.label} must be at least ${validation.min}`;
        }
        if (validation.max !== undefined && value > validation.max) {
          return `${fieldConfig.label} must be at most ${validation.max}`;
        }
      }

      // Custom validation
      if (validation.custom) {
        const customError = validation.custom(value);
        if (customError) return customError;
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.editableFields) {
      return true;
    }

    // Validate each field
    config.editableFields.forEach(field => {
      const value = formData[field.key];
      const error = validateField(String(field.key), value, field);
      if (error) {
        newErrors[String(field.key)] = error;
      }
    });

    // Run additional config validation if provided
    if (config.validateForm) {
      const configErrors = config.validateForm(formData);
      Object.assign(newErrors, configErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));

    // Clear error for this field
    if (errors[String(key)]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[String(key)];
        return newErrors;
      });
    }
  };

  const handleBlur = (key: keyof T) => {
    if (!config.editableFields) return;

    const fieldConfig = config.editableFields.find(f => f.key === key);
    if (!fieldConfig) return;

    const value = formData[key];
    const error = validateField(String(key), value, fieldConfig);
    
    setErrors(prev => ({
      ...prev,
      ...(error ? { [String(key)]: error } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (fieldConfig: FormFieldConfig<T>) => {
    const value = formData[fieldConfig.key];
    const error = errors[String(fieldConfig.key)];
    const fieldId = `field-${String(fieldConfig.key)}`;
    const isPromptImmutable =
      mode === 'edit' &&
      config.title === 'Prompts' &&
      (String(fieldConfig.key) === 'email_address' || String(fieldConfig.key) === 'prompt_name');
    const isDisabled = Boolean(fieldConfig.disabled || isPromptImmutable);
    const isReadOnly = Boolean(fieldConfig.readonly || isPromptImmutable);
    const isPromptDescription = String(fieldConfig.key) === 'prompt_description';

    // For prompt_description, use full width layout; otherwise use compact horizontal layout
    if (isPromptDescription) {
      return (
        <div key={String(fieldConfig.key)} className="mb-4">
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            id={fieldId}
            value={value as string || ''}
            onChange={(e) => handleChange(fieldConfig.key, e.target.value)}
            onBlur={() => handleBlur(fieldConfig.key)}
            placeholder={fieldConfig.placeholder}
            disabled={isDisabled}
            readOnly={isReadOnly}
            required={fieldConfig.required}
            rows={12}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
          {fieldConfig.helpText && !error && (
            <p className="mt-1 text-sm text-gray-500">{fieldConfig.helpText}</p>
          )}
        </div>
      );
    }

    // Compact horizontal layout for other fields
    return (
      <div key={String(fieldConfig.key)} className="mb-3 flex items-start">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-gray-700 w-40 flex-shrink-0 pt-2"
        >
          {fieldConfig.label}
          {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex-1">
          {fieldConfig.type === 'textarea' ? (
            <textarea
              id={fieldId}
              value={value as string || ''}
              onChange={(e) => handleChange(fieldConfig.key, e.target.value)}
              onBlur={() => handleBlur(fieldConfig.key)}
              placeholder={fieldConfig.placeholder}
              disabled={isDisabled}
              readOnly={isReadOnly}
              required={fieldConfig.required}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
          ) : fieldConfig.type === 'select' ? (
            <select
              id={fieldId}
              value={String(value || '')}
              onChange={(e) => handleChange(fieldConfig.key, e.target.value)}
              onBlur={() => handleBlur(fieldConfig.key)}
              disabled={isDisabled}
              required={fieldConfig.required}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            >
              <option value="">Select {fieldConfig.label}</option>
              {fieldConfig.options?.map(option => (
                <option key={String(option.value)} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : fieldConfig.type === 'boolean' ? (
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleChange(fieldConfig.key, !value)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                disabled={isDisabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">{value ? 'Yes' : 'No'}</span>
            </div>
          ) : (
            <input
              id={fieldId}
              type={fieldConfig.type}
              value={value as string || ''}
              onChange={(e) => handleChange(fieldConfig.key, e.target.value)}
              onBlur={() => handleBlur(fieldConfig.key)}
              placeholder={fieldConfig.placeholder}
              disabled={isDisabled}
              readOnly={isReadOnly}
              required={fieldConfig.required}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            />
          )}
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
          {fieldConfig.helpText && !error && (
            <p className="mt-1 text-sm text-gray-500">{fieldConfig.helpText}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={panelRef}
        className="bg-white rounded-lg shadow-xl max-w-[50.4rem] w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col"
        style={{ transform: `translate(${dragPos.x}px, ${dragPos.y}px)` }}
      >
        {/* Header - Draggable */}
        <div
          className="flex items-center justify-between p-3 border-b border-gray-200 select-none md:cursor-move bg-gray-100 text-gray-900 rounded-t-lg"
          onMouseDown={onHeaderMouseDown}
        >
          <h3 className="text-sm font-semibold">
            {mode === 'create' ? `Create ${config.title}` : `Edit ${config.title}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto flex-1">
            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{saveError}</p>
              </div>
            )}

            {config.editableFields ? (
              config.editableFields.map(field => renderField(field))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No editable fields configured
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


