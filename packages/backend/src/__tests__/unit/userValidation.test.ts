import { updateNameSchema } from '../../validation/userValidation';

describe('User Validation - updateNameSchema', () => {
  it('should validate a correct name', () => {
    const payload = { body: { nome: 'João Silva' } };
    const result = updateNameSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.nome).toBe('João Silva');
    }
  });

  it('should trim whitespace', () => {
    const payload = { body: { nome: '  João Silva  ' } };
    const result = updateNameSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.nome).toBe('João Silva');
    }
  });

  it('should collapse multiple spaces', () => {
    const payload = { body: { nome: 'João    Silva' } };
    const result = updateNameSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.nome).toBe('João Silva');
    }
  });

  it('should reject names shorter than 3 characters', () => {
    const payload = { body: { nome: 'Jo' } };
    const result = updateNameSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject names longer than 50 characters', () => {
    const payload = { body: { nome: 'a'.repeat(51) } };
    const result = updateNameSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('should reject names with numbers or special characters', () => {
    const payloads = [
      { body: { nome: 'João 123' } },
      { body: { nome: 'João @ Silva' } },
      { body: { nome: 'João_Silva' } }
    ];

    payloads.forEach(payload => {
      const result = updateNameSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  it('should allow accented characters', () => {
    const payload = { body: { nome: 'Conceição Água' } };
    const result = updateNameSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
