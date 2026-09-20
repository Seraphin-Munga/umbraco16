// Ported 1:1 from Web/CustomValidators/CustomValidation.cs (source was present).
export class CustomValidation {
  private regulate(expression: string, data: string): boolean {
    return new RegExp(expression, 'i').test(data);
  }

  private sizedPattern(charClass: string, length: number): string {
    const size = length > 0 ? length : 50;
    return `^${charClass}{1,${size}}$`;
  }

  validateString(data: string, length: number): boolean {
    return this.regulate(this.sizedPattern('[a-zA-Z]', length), data);
  }

  validateInteger(data: string, length: number): boolean {
    return this.regulate(this.sizedPattern('[0-9]', length), data);
  }

  validateEmail(data: string): boolean {
    if (data.length >= 50) {
      return false;
    }
    const expression =
      /^([\w-.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(]?)/i;
    return expression.test(data);
  }

  validateId(data: string, length: number): boolean {
    const size = length > 0 ? length : 50;
    const pattern = new RegExp(`^[0-9]{${size}}$`, 'i');
    return pattern.test(data) && this.validateAgeRestriction(data);
  }

  private validateAgeRestriction(idNumber: string): boolean {
    const currentYear = new Date().getFullYear();
    let yearOfBirth = parseInt(idNumber.substring(0, 2), 10);

    yearOfBirth =
      yearOfBirth + 2000 < currentYear
        ? 2000 + yearOfBirth
        : 1900 + yearOfBirth;

    const age = currentYear - yearOfBirth;
    return !(age >= 91 || age <= 18);
  }
}
