export enum EntropyState {
  STABLE = 'STABLE',
  DEGRADING = 'DEGRADING',
  REGENERATING = 'REGENERATING'
}

export class EarthPOD {
  public sun: any;
  public earth: any;

  constructor(sun?: any, earth?: any) {
    this.sun = sun;
    this.earth = earth;
  }
}

export function bootstrapMegaPod(config?: any): EarthPOD {
  return new EarthPOD(config?.sun, config?.earth);
}