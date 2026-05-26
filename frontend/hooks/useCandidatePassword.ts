const useCandidatePassword = (name:string, id: number) => {
    console.log("name", name)
  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  return `${cleanName}${id}`;
}

export default useCandidatePassword;