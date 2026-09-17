# My Homework

Монгол хэлтэй, утас болон компьютерт тохирсон гэрийн даалгаврын веб.

- Хичээл, хийх зүйл, хугацаа нэмэх ба засах
- Хийж дууссанаа тэмдэглэх
- Хугацаа хэтэрсэн болон өнөөдрийн даалгаврыг ялгах
- Хичээлээр шүүх
- Firebase account-аар төхөөрөмж хооронд Firestore sync хийх
- Login, Sign up, Profile нь тусдаа HTML хуудастай

## GitHub Pages дээр нээх

1. Repository-ийн **Settings → Pages** рүү орно.
2. **Source → Deploy from a branch** сонгоно.
3. **Branch → main**, **Folder → / (root)** сонгоод **Save** дарна.
4. Deploy дууссаны дараа `https://FGadaruugan.github.io/My_Homework/` хаягаар нээнэ.

## Firebase Authentication

Энэ төсөл `FGadaruugan/Message` дээр ажиллаж байгаа `badar-uuganlogni` Firebase Web project-ийг reuse хийнэ.

Firebase Console → **Authentication → Sign-in method**:
- Email/Password: Enabled
- Google: Enabled

Firebase Console → **Authentication → Settings → Authorized domains**:
- `fgadaruugan.github.io` authorized байх ёстой.

Нэвтрэх бүтэц:
- `login.html` — email/password, Google login, password reset link
- `signup.html` — шинэ account
- `profile.html` — profile update + logout
- `index.html` — зөвхөн authenticated homework app

6 оронтой OTP/custom SMTP ашиглахгүй.

## Firestore cloud sync

Homework data:

```text
my_homework/{uid}
```

`uid` нь Firebase Authentication-ийн current user ID байна. Browser дээр `my-homework:v1` localStorage cache хэвээр ашиглагдах бөгөөд анхны Firebase login дээр remote хоосон байвал local homework Firestore руу seed хийнэ.

Firebase Console → **Firestore Database → Rules** дээр `firestore.rules`-ийн `my_homework/{uid}` rule-ийг Message төслийн одоо байгаа rules-тэй **merge** хийгээд publish хийнэ. Бусад `/users` rules-ийг дарж сольж болохгүй.

Required ownership rule:

```text
match /my_homework/{uid} {
  allow read, create, update, delete: if request.auth != null && request.auth.uid == uid;
}
```

## Security

`firebase.js` доторх Firebase Web config нь browser client configuration. Firebase Admin SDK private key, service-account JSON, server secret зэрэг нууц credential-ийг repository-д хэзээ ч commit хийхгүй.

Нууц үгийг Firestore эсвэл localStorage-д хадгалахгүй. Firestore authorization нь UI-аар биш Security Rules-аар хамгаалагдана.

## Файлууд

- `index.html` — homework app
- `login.html` — login
- `signup.html` — sign up
- `profile.html` — profile
- `firebase.js` — Firebase client initialization
- `auth.js` — Firebase Authentication service
- `cloud-sync.js` — Firestore homework sync
- `firebase-auth-utils.js` — validation/sync helper functions
- `firestore.rules` — My_Homework ownership rule reference
- `model.js` — homework data model
- `app.js` — homework UI logic

Build эсвэл npm install шаардлагагүй. GitHub Pages дээр static байдлаар ажиллана.
