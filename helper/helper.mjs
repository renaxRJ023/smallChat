const avatarText = (name) => {
    // const fname = name.split(' ')[0];
    // const lname = name.split(' ')[1];
    // return `${fname.slice(0, 1)}${lname.slice(0, 1)}`;
    return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export default { avatarText }