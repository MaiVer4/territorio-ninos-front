#!/bin/bash
sed -i '/login(credentials/i \
  forgotPassword(email: string) {\n    return this.http.post<{mensaje: string}>(`${this.apiUrl}/forgot-password`, { email });\n  }\n\n  resetPassword(token: string, nuevaContrasena: string) {\n    return this.http.patch<{mensaje: string}>(`${this.apiUrl}/reset-password`, { token, nuevaContrasena });\n  }\n' src/app/core/services/auth.service.ts
