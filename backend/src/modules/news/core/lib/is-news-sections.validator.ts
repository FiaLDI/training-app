import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

import { isNewsSections } from './is-news-sections'

@ValidatorConstraint({ name: 'isNewsSections', async: false })
export class IsNewsSectionsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return isNewsSections(value)
  }

  defaultMessage() {
    return 'Укажите хотя бы одну секцию с заголовком и текстом или списком'
  }
}

export function IsNewsSections(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsNewsSectionsConstraint,
    })
  }
}
