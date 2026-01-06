import { validateCPF } from '../cpf';

describe('CPF Validation Utility (Mobile)', () => {
  it('deve retornar true para um CPF válido sem formatação', () => {
    expect(validateCPF('52998224725')).toBe(true);
    expect(validateCPF('12345678909')).toBe(true);
  });

  it('deve retornar true para um CPF válido com formatação', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
    expect(validateCPF('123.456.789-09')).toBe(true);
  });

  it('deve retornar false para CPFs com todos os dígitos iguais', () => {
    expect(validateCPF('00000000000')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
  });

  it('deve retornar false para CPFs com tamanho inválido', () => {
    expect(validateCPF('1234567890')).toBe(false);
    expect(validateCPF('123')).toBe(false);
  });

  it('deve retornar false para CPFs com dígitos verificadores inválidos', () => {
    expect(validateCPF('12345678901')).toBe(false);
  });
});
