import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordStep1Dto, ForgotPasswordStep2Dto, ForgotPasswordStep3Dto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  private getClientInfo(req: any) {
    return {
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 401, description: 'User already exists' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto, @Request() req) {
    const { ipAddress, userAgent } = this.getClientInfo(req);
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('forgot-password/step1')
  @ApiOperation({ summary: 'Forgot Password Step 1: Verify email' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 401, description: 'Email not found' })
  forgotPasswordStep1(@Body() dto: ForgotPasswordStep1Dto) {
    return this.authService.forgotPasswordStep1(dto.email);
  }

  @Post('forgot-password/step2')
  @ApiOperation({ summary: 'Forgot Password Step 2: Verify password hint' })
  @ApiResponse({ status: 200, description: 'Password hint verified' })
  @ApiResponse({ status: 401, description: 'Password hint does not match' })
  forgotPasswordStep2(@Body() dto: ForgotPasswordStep2Dto) {
    return this.authService.forgotPasswordStep2(dto.email, dto.passwordhint);
  }

  @Post('forgot-password/step3')
  @ApiOperation({ summary: 'Forgot Password Step 3: Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  forgotPasswordStep3(@Body() dto: ForgotPasswordStep3Dto) {
    return this.authService.forgotPasswordStep3(dto.email, dto.passwordhint, dto.newPassword);
  }
}

