import { Injectable } from '@angular/core';
import { Employee } from './app-state';

@Injectable({ providedIn: 'root' })
export class PayrollCalcService {

  calcPF(emp: Employee): number {
    const tag = emp.pfTag || 'F';
    const basic = emp.basic || 0;
    const gross = basic + (emp.hra || 0) + (emp.special || 0);
    if (tag === 'NIL') return 0;
    if (tag === 'F') return Math.round(basic * 0.12);
    if (tag === 'FN') return basic > 15000 ? 1800 : Math.round(basic * 0.12);
    if (tag === 'N') return Math.round((gross - (emp.hra || 0)) * 0.12);
    if (tag === 'M') return Math.round(basic * 0.12);
    return Math.round(basic * 0.12);
  }

  calcESI(emp: Employee): number {
    if (!emp.esiApply) return 0;
    const gross = (emp.basic || 0) + (emp.hra || 0) + (emp.special || 0);
    if (gross > 21000) return 0;
    return Math.round(gross * 0.0075);
  }

  calcPT(emp: Employee): number {
    if (!emp.ptApply) return 0;
    const monthly = (emp.basic || 0) + (emp.hra || 0) + (emp.special || 0);
    const sixMonth = monthly * 6;
    let ptSlab = 0;
    if (sixMonth <= 21000) ptSlab = 0;
    else if (sixMonth <= 30000) ptSlab = 180;
    else if (sixMonth <= 45000) ptSlab = 425;
    else if (sixMonth <= 60000) ptSlab = 930;
    else if (sixMonth <= 75000) ptSlab = 1025;
    else ptSlab = 1250;
    return Math.round(ptSlab / 6);
  }

  calcNewRegimeTax(annualTaxable: number): number {
    const slabs = [
      { from: 0, to: 300000, rate: 0 },
      { from: 300000, to: 700000, rate: 0.05 },
      { from: 700000, to: 1000000, rate: 0.10 },
      { from: 1000000, to: 1200000, rate: 0.15 },
      { from: 1200000, to: 1500000, rate: 0.20 },
      { from: 1500000, to: Infinity, rate: 0.30 },
    ];
    if (annualTaxable <= 700000) return 0;
    let tax = 0;
    for (const s of slabs) {
      if (annualTaxable <= s.from) break;
      tax += (Math.min(annualTaxable, s.to) - s.from) * s.rate;
    }
    return Math.round(tax * 1.04);
  }

  calcOldRegimeTax(annualTaxable: number): number {
    const slabs = [
      { from: 0, to: 250000, rate: 0 },
      { from: 250000, to: 500000, rate: 0.05 },
      { from: 500000, to: 1000000, rate: 0.20 },
      { from: 1000000, to: Infinity, rate: 0.30 },
    ];
    let tax = 0;
    for (const s of slabs) {
      if (annualTaxable <= s.from) break;
      tax += (Math.min(annualTaxable, s.to) - s.from) * s.rate;
    }
    if (annualTaxable <= 500000) tax = Math.max(0, tax - 12500);
    return Math.round(tax * 1.04);
  }

  fmt(n: number): string { return '₹' + (Math.round(n || 0)).toLocaleString('en-IN'); }

  fmtL(n: number): string {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
    return this.fmt(n);
  }
}
