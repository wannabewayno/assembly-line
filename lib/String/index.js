String.prototype.capitalize = function() {
    return this.replace(/^\w/, firstLetter => firstLetter.toUpperCase());
}

String.prototype.toCamelCase = function() {
    const [first, ...rest] = this.split(/[\s-_:;.]/g);
    return [].concat(first, rest.map(v => v.capitalize())).join('');
}

String.prototype.toPascalCase = function() {
    return capitalize(this.toCamelCase());
}