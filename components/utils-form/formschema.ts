const formSchemaWithTranslations = {
  "title": {
    "en": "Registration Form",
    "rw": "Ifishi yo Kwiyandikisha"
  },
  "components": [
    {
      "key": "fullName",
      "label": {
        "en": "Full Name",
        "rw": "Amazina Yuzuye"
      },
      "placeholder": {
        "en": "Enter your name",
        "rw": "Injiza amazina yawe"
      },
      "errorLabel": {
        "en": "Name is required",
        "rw": "Amazina arakenewe"
      }
    },
    {
      "key": "email",
      "label": {
        "en": "Email",
        "rw": "Imeyili"
      },
      "placeholder": {
        "en": "Enter your email address",
        "rw": "Injiza aderesi ya imeyili"
      },
      "errorLabel": {
        "en": "Email is required",
        "rw": "Imeyili irakenewe"
      }
    },
    {
      "key": "gender",
      "label": {
        "en": "Gender",
        "rw": "Igitsina"
      },
      "errorLabel": {
        "en": "Gender is required",
        "rw": "Igitsina kirakenewe"
      },
      "data": {
        "values": [
          { "en": "Male", "rw": "Gabo" },
          { "en": "Female", "rw": "Gore" },
          { "en": "Other", "rw": "Ikindi" }
        ]
      }
    },
    {
      "key": "bio",
      "label": {
        "en": "Short Bio",
        "rw": "Ibisobanuro bigufi"
      },
      "placeholder": {
        "en": "Write about yourself",
        "rw": "Andika amakuru yawe"
      }
    },
    {
      "key": "submit",
      "label": {
        "en": "Submit",
        "rw": "Ohereza"
      }
    }
  ]
};

export default formSchemaWithTranslations;


