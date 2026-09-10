# API Architecture

Base path: `/api/v1`

- `/auth`
- `/users`
- `/patients`
- `/doctors`
- `/appointments`
- `/queues`
- `/encounters`
- `/clinical`
- `/admissions`
- `/beds`
- `/nursing`
- `/laboratory`
- `/radiology`
- `/pharmacy`
- `/billing`
- `/insurance`
- `/inventory`
- `/emergency`
- `/notifications`
- `/audit`
- `/dashboard`
- `/reports`

Request flow: authentication → authorization/scope → validation → transactional service → audit event → notification/event.
