import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditService } from '../common/services/audit.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
  const user = await this.validateUser(loginDto.email, loginDto.password);

  // Invalid credentials
  if (!user) {
    await this.auditService.logChange(
      'auth',
      'login_failed',
      0,
      0,
      { email: loginDto.email, ipAddress, userAgent },
      `Failed login attempt for email: ${loginDto.email}`
    );
    throw new UnauthorizedException('Invalid credentials');
  }

  // Block inactive users (isActive = 0)
  if (!user.isActive) {
    await this.auditService.logChange(
      'auth',
      'login_failed_inactive',
      user.id,
      user.id,
      { email: user.email, username: user.username, isActive: user.isActive },
      `Inactive user attempted login: ${user.username} (${user.email})`
    );

    throw new UnauthorizedException(
      'Your account is deactivated. Please contact the administrator.'
    );
  }

  // Successful login
  const payload = { 
    email: user.email, 
    sub: user.id, 
    role: user.role,
    username: user.username 
  };

  await this.auditService.logChange(
    'auth',
    'login_success',
    user.id,
    user.id,
    { email: user.email, username: user.username, role: user.role },
    `User ${user.username} (${user.email}) logged in successfully`
  );

  return {
    access_token: this.jwtService.sign(payload),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      role: user.role,
      imagePath: user.imagePath,
      isActive: user.isActive,
    },
  };
}


  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }
    const user = await this.usersService.create({
      ...registerDto,
      role: 'user',
      passwordhint: registerDto.passwordhint,
      isActive: true,
    });
    const { password, ...result } = user;
    return result;
  }

  // Forgot Password Step 1: Verify email exists
  async forgotPasswordStep1(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email not found');
    }
    return {
      message: 'Email verified. Please provide your password hint.',
      email: user.email,
    };
  }

  // Forgot Password Step 2: Verify password hint
  async forgotPasswordStep2(email: string, passwordhint: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email not found');
    }
    
    // Compare password hint (case-insensitive)
    if (user.passwordhint.toLowerCase().trim() !== passwordhint.toLowerCase().trim()) {
      throw new UnauthorizedException('Password hint does not match');
    }

    return {
      message: 'Password hint verified. You can now reset your password.',
      email: user.email,
    };
  }

  // Forgot Password Step 3: Reset password
  async forgotPasswordStep3(email: string, passwordhint: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email not found');
    }
    
    // Verify password hint again
    if (user.passwordhint.toLowerCase().trim() !== passwordhint.toLowerCase().trim()) {
      throw new UnauthorizedException('Password hint does not match');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Log the password reset
    await this.auditService.logChange(
      'auth',
      'password_reset',
      user.id,
      user.id,
      { email: user.email, username: user.username },
      `User ${user.username} reset their password via forgot password flow`
    );

    return {
      message: 'Password reset successfully. You can now login with your new password.',
      email: user.email,
    };
  }
}

