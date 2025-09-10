import { useForm as useHookForm, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface UseFormOptions<TSchema extends z.ZodTypeAny> extends Omit<UseFormProps<z.infer<TSchema>>, 'resolver'> {
    schema: TSchema;
}

export const useForm = <TSchema extends z.ZodTypeAny>({
                                                          schema,
                                                          ...options
                                                      }: UseFormOptions<TSchema>) => {
    return useHookForm<z.infer<TSchema>>({
        resolver: zodResolver(schema),
        mode: 'onChange',
        ...options,
    });
};
