
const registerInstitutionAndUser = require("./register_inst_user")

//execute after main is completed and k8s configuration is updated and ucl-node are been restarted
registerInstitutionAndUser().then();